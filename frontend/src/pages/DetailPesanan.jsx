import { A, useLocation, useNavigate } from "@solidjs/router";
import ChevronLeft from "../assets/svg/ChevronLeft";
import { patch } from "../utils/api.js";

import { formatRupiah } from "../utils/formatter";
import { createSignal, For } from "solid-js";

export default function DetailPesanan() {
    const location = useLocation();
    const navigate = useNavigate();

    const statusOptions = ["antri", "proses", "selesai", "diambil"];

    const [status, setStatus] = createSignal("antri");

    async function selesaikanPesanan(id) {
        const formData = new FormData();
        formData.set("status_proses", status());

        const [res, err] = await patch("pesanan/" + id + "/status", formData);
        if (err) {
            console.log(err);
            return;
        }

        alert("Status berhasil diubah!");
        navigate("/dashboard");
    }

    return (
        <main class="p-4 flex justify-center items-center">
            <div class="max-w-lg w-full">
                <div class="card bg-white shadow-md border border-black/20">
                    <div class="card-body pt-4">
                        <div class="card-actions">
                            <A href="/dashboard" class="btn btn-ghost mb-2">
                                <ChevronLeft class="size-6" />
                                Kembali
                            </A>
                        </div>
                        <h2 class="card-title md:text-2xl font-bold justify-center mb-4">
                            {location.state.no_resi}
                        </h2>
                        <div class="grid grid-cols-2 md:text-lg gap-2 md:gap-4">
                            <strong>Nama Pelanggan</strong>
                            <span>: {location.state.nama_pelanggan}</span>
                            <strong>Total Harga</strong>
                            <span>
                                : {formatRupiah(location.state.total_harga)}
                            </span>
                            <strong>Berat</strong>
                            <span>: {location.state.berat} kg</span>
                            <strong>Status Proses</strong>
                            <span>: {location.state.status_proses}</span>
                            <strong>Metode Pembayaran</strong>
                            <span>: {location.state.metode_pembayaran}</span>
                            <strong>Status Pembayaran</strong>
                            <span>: {location.state.status_pembayaran}</span>
                            <strong>Layanan</strong>
                            <span>: {location.state.nama_layanan}</span>
                        </div>
                        <div class="flex gap-4 mt-4">
                            <select
                                class="select"
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <For each={statusOptions}>
                                    {(item) => (
                                        <option value={item}>
                                            {item.charAt(0).toUpperCase() +
                                                item.slice(1)}
                                        </option>
                                    )}
                                </For>
                            </select>
                            <button
                                class="flex-1 btn btn-primary"
                                onClick={() =>
                                    selesaikanPesanan(location.state.id)
                                }
                            >
                                Ubah Status
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
