import { createSignal, For, onMount } from "solid-js";
import { get, post } from "../utils/api";
import { useNavigate } from "@solidjs/router";

export default function BuatPesanan() {
    const navigate = useNavigate();

    const [layanan, setLayanan] = createSignal([]);
    const [submitting, setSubmitting] = createSignal(false);

    onMount(async () => {
        const [res, err] = await get("layanan");
        if (err) {
            alert("Ada yang salah");
            return;
        }

        setLayanan(res);
    });

    async function handleForm(event) {
        event.preventDefault();
        setSubmitting(true);
        const formData = new FormData(event.target);
        const [res, err] = await post("pesanan", formData);

        if (err) {
            console.log(err);
            setSubmitting(false);
        }

        navigate("/dashboard");
    }

    return (
        <main class="h-full flex flex-col justify-center items-center">
            <div>
                <form onSubmit={handleForm}>
                    <fieldset class="fieldset bg-white border-base-300 rounded-box w-xs border p-4">
                        <legend class="fieldset-legend">Buat Pesanan</legend>

                        <label class="label">Nama Pelanggan</label>
                        <input
                            required
                            name="nama_pelanggan"
                            type="text"
                            class="input"
                            placeholder="John Doe"
                        />

                        <label class="label">Nomor HP</label>
                        <input
                            required
                            name="no_hp"
                            type="number"
                            class="input"
                            placeholder="08123123123"
                        />

                        <label class="label">Layanan</label>
                        <select
                            name="layanan_id"
                            class="select"
                            disabled={!layanan().length}
                        >
                            <For each={layanan()}>
                                {(item, index) => (
                                    <option value={item.id}>
                                        {item.nama_layanan}
                                    </option>
                                )}
                            </For>
                        </select>

                        <label class="label">Berat Barang</label>
                        <input
                            required
                            name="berat"
                            type="number"
                            class="input"
                            placeholder="satuan (kg)"
                        />

                        <label class="label">Metode Pembayaran</label>
                        <select name="metode_pembayaran" class="select">
                            <option value="Tunai">Tunai</option>
                            <option value="Saldo">Saldo</option>
                        </select>

                        <button
                            disabled={submitting()}
                            type="submit"
                            class="btn btn-primary mt-4"
                        >
                            Buat Pesanan
                        </button>
                    </fieldset>
                </form>
            </div>
        </main>
    );
}
