const { connectDB } = require("../config/database");
const { kirimPesanWhatapp } = require("../utils/whatsapp");

const formatRupiah = (angka) => new Intl.NumberFormat("id-ID").format(angka);

/**
 * Endpoint membuat pesanan baru & auto-upsert pelanggan
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const buatPesanan = async (req, res) => {
    try {
        const { no_hp, nama_pelanggan, layanan_id, berat, metode_pembayaran } =
            req.body;
        const db = await connectDB();

        if (
            !no_hp ||
            !nama_pelanggan ||
            !layanan_id ||
            !berat ||
            !metode_pembayaran
        ) {
            return res
                .status(400)
                .json({ message: "Semua field wajib diisi!" });
        }

        const layanan = await db.get(`SELECT * FROM layanan WHERE id = ?`, [
            layanan_id,
        ]);
        if (!layanan)
            return res
                .status(404)
                .json({ message: "Layanan tidak ditemukan!" });

        const total_harga = Number(berat) * layanan.harga;
        const no_resi = `STRUK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const status_bayar =
            metode_pembayaran === "TUNAI" ? "belum lunas" : "lunas";
        console.log(
            `status pembayaran: ${metode_pembayaran}, berat: ${berat}, layanan_id: ${status_bayar}`,
        );

        // RAW SQL Upsert Pelanggan (Ganti nama jika nomor HP sudah terdaftar)
        await db.run(
            `
            INSERT INTO pelanggan (nama, no_hp) VALUES (?, ?)
            ON CONFLICT(no_hp) DO UPDATE SET nama = excluded.nama
        `,
            [nama_pelanggan, no_hp],
        );

        const pelanggan = await db.get(
            `SELECT id, nama FROM pelanggan WHERE no_hp = ?`,
            [no_hp],
        );

        const result = await db.run(
            `
            INSERT INTO pesanan (no_resi, berat, total_harga, status_pembayaran, metode_pembayaran, pelanggan_id, layanan_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
            [
                no_resi,
                berat,
                total_harga,
                status_bayar,
                metode_pembayaran,
                pelanggan.id,
                layanan.id,
            ],
        );

        // TRIGGER WA 1: Pesanan Masuk
        const teksMasuk =
            `*LaunderLand - PESANAN DITERIMA* 📥\n\n` +
            `Halo Kak *${pelanggan.nama}*,\n` +
            `Cucianmu sudah aman bersama kami dengan data berikut:\n\n` +
            `- No. Resi: *${no_resi}*\n` +
            `- Layanan: ${layanan.nama_layanan}\n` +
            `- Berat: ${berat} Kg\n` +
            `- Tagihan: Rp ${formatRupiah(total_harga)} (${status_bayar.toUpperCase()})\n\n` +
            `> Kami akan kabari lagi via WhatsApp jika pakaianmu sudah siap diambil. Terima kasih! ✨`;

        await kirimPesanWhatapp(no_hp, teksMasuk);

        return res.status(201).json({
            message: "Pesanan berhasil dibuat!",
            data: { id: result.lastID, no_resi, total_harga },
        });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Server Error", error: error.message });
    }
};

/**
 * Endpoint mengubah status proses cucian & otomatis kirim E-Nota jika 'selesai'
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status_proses } = req.body; // antri, proses, selesai, diambil
        if (!status_proses) {
            return res
                .status(400)
                .json({ message: "Field 'status_proses' wajib diisi!" });
        }
        const validStatus = ["antri", "proses", "selesai", "diambil"];
        if (!validStatus.includes(status_proses)) {
            return res.status(400).json({
                message: `Status proses tidak valid! Pilih salah satu: ${validStatus.join(", ")}`,
            });
        }
        const db = await connectDB();

        const pesanan = await db.get(
            `
            SELECT p.*, pl.nama, pl.no_hp, l.nama_layanan, l.harga as harga_layanan
            FROM pesanan p
            JOIN pelanggan pl ON p.pelanggan_id = pl.id
            JOIN layanan l ON p.layanan_id = l.id
            WHERE p.id = ?
        `,
            [id],
        );

        if (!pesanan)
            return res
                .status(404)
                .json({ message: "Pesanan tidak ditemukan!" });

        await db.run(`UPDATE pesanan SET status_proses = ? WHERE id = ?`, [
            status_proses,
            id,
        ]);

        // TRIGGER WA 2: Kirim E-Nota Terperinci saat status diubah menjadi 'selesai'
        if (status_proses === "selesai") {
            const statusNota =
                pesanan.status_pembayaran === "lunas"
                    ? "LUNAS (Sudah Dibayar)"
                    : "BELUM LUNAS (Bayar saat ambil)";
            const teksSelesai =
                `*LaunderLand - E-NOTA* ✨\n` +
                `Status: *${statusNota}*\n` +
                `===============================\n` +
                `- Detail pesanan:\n\n` +
                `- ✅ ${pesanan.berat} Kg  ${pesanan.nama_layanan} @ Rp ${formatRupiah(pesanan.harga_layanan)}\n` +
                `- Total: Rp ${formatRupiah(pesanan.total_harga)}\n` +
                `===============================\n` +
                `*TOTAL TAGIHAN: Rp ${formatRupiah(pesanan.total_harga)}*\n\n` +
                `Pakaianmu sudah selesai dicuci dan siap diambil di outlet ruko ruko terdekat! Please datang ya.\n\n` +
                `> Terima kasih telah mempercayakan pakaianmu di LaunderLand! 🙏`;

            await kirimPesanWhatapp(pesanan.no_hp, teksSelesai);
        }

        return res.json({
            message: `Status pesanan berhasil diupdate menjadi ${status_proses}`,
        });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Server Error", error: error.message });
    }
};

/**
 * Endpoint memunculkan daftar seluruh pesanan aktif untuk Dashboard Owner
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const listPesanan = async (req, res) => {
    try {
        const db = await connectDB();
        const data = await db.all(`
            SELECT p.id, p.no_resi, p.berat, p.total_harga, p.status_proses, p.status_pembayaran, p.metode_pembayaran, p.tanggal_masuk,
                   pl.nama as nama_pelanggan, l.nama_layanan
            FROM pesanan p
            JOIN pelanggan pl ON p.pelanggan_id = pl.id
            JOIN layanan l ON p.layanan_id = l.id
            ORDER BY p.id DESC
        `);
        return res.json({
            message: "Daftar pesanan berhasil diambil!",
            data: data,
        });
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};

const detailPesanan = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res
                .status(400)
                .json({ message: "Parameter 'id' wajib diisi!" });
        }
        const db = await connectDB();
        const data = await db.get(
            `
            SELECT p.*, pl.nama as nama_pelanggan, pl.no_hp, l.nama_layanan, l.harga as harga_layanan
            FROM pesanan p
            JOIN pelanggan pl ON p.pelanggan_id = pl.id
            JOIN layanan l ON p.layanan_id = l.id
            WHERE p.id = ?
        `,
            [id],
        );

        if (!data)
            return res.status(404).json({
                message: "Pesanan tidak ditemukan!",
            });
        return res.json({
            message: "Detail pesanan berhasil diambil!",
            data: data,
        });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Server Error", error: error.message });
    }
};

const updateStatusPembayaran = async (req, res) => {
    try {
        const { no_resi } = req.params; // Ambil no_resi dari URL
        if (!no_resi) {
            return res
                .status(400)
                .json({ message: "Parameter 'no_resi' wajib diisi!" });
        }
        const db = await connectDB();

        // Cari pesanan berdasarkan no_resi
        const pesanan = await db.get(
            `
            SELECT p.*, pl.nama, pl.no_hp
            FROM pesanan p
            JOIN pelanggan pl ON p.pelanggan_id = pl.id
            WHERE p.no_resi = ?
        `,
            [no_resi],
        );

        if (!pesanan) {
            return res
                .status(404)
                .json({ message: "Pesanan tidak ditemukan!" });
        }

        if (pesanan.status_pembayaran === "lunas") {
            return res
                .status(400)
                .json({ message: "Pesanan ini sudah berstatus lunas!" });
        }

        // Update status menjadi lunas
        await db.run(
            `UPDATE pesanan SET status_pembayaran = 'lunas' WHERE no_resi = ?`,
            [no_resi],
        );

        // (Opsional) Kirim notifikasi WA pelunasan manual
        const teksLunas =
            `*LaunderLand - PEMBAYARAN LUNAS* 💳\n\n` +
            `Halo Kak *${pesanan.nama}*,\n` +
            `Pembayaran tunai/manual untuk nota *${no_resi}* sebesar *Rp ${formatRupiah(pesanan.total_harga)}* telah kami terima.\n\n` +
            `Terima kasih! 🙏✨`;

        await kirimPesanWhatapp(pesanan.no_hp, teksLunas);

        return res.json({
            message: "Pembayaran berhasil dicatat sebagai lunas!",
            data: { no_resi, status_pembayaran: "lunas" },
        });
    } catch (error) {
        console.error("Error pelunasan manual:", error);
        return res
            .status(500)
            .json({ message: "Server Error", error: error.message });
    }
};

module.exports = {
    buatPesanan,
    updateStatus,
    listPesanan,
    detailPesanan,
    updateStatusPembayaran,
};
