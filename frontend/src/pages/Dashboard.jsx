import { createSignal, For, onMount, Show } from "solid-js";
import Loading from "../components/Loading.jsx";
import { get } from "../utils/api.js";
import { A } from "@solidjs/router";

import Plus from "../assets/svg/Plus.jsx";

export default function Dashboard() {
    const statusStyle = {
        antri: "bg-gray-500",
        proses: "bg-orange-500",
        selesai: "bg-green-500",
        diambil: "bg-purple-500",
    };

    const [pesanan, setPesanan] = createSignal();
    const [isLoading, setIsLoading] = createSignal(true);

    onMount(async () => {
        const [res, err] = await get("pesanan");

        if (err) {
            alert("Ada kendala di server!");
            setPesanan([]);
            setIsLoading(false);
            return;
        }

        setPesanan(res.data);

        setIsLoading(false);
    });

    return (
        <main class="p-4 relative">
            <div class="max-w-4xl mx-auto flex flex-col h-full">
                <div class="my-4 mb-8 flex justify-between">
                    <h2 class="font-bold text-2xl">Dashboard</h2>
                    <A href="/pesanan/buat" class="btn btn-lprimary">
                        <Plus class="size-5" />
                        Pesanan Baru
                    </A>
                </div>

                <Show when={!isLoading()} fallback={<Loading />}>
                    <Show
                        when={pesanan().length}
                        fallback={
                            <div class="h-full flex flex-col justify-center items-center gap-4">
                                <p class="text-2xl italic">
                                    Tidak ada pesanan.
                                </p>
                                <A href="/pesanan/buat" class="btn btn-primary">
                                    Buat pesanan baru
                                </A>
                            </div>
                        }
                    >
                        <div class="overflow-x-auto">
                            <table class="table table-zebra shadow-md bg-white">
                                <thead class="bg-lprimary-600 text-white">
                                    <tr>
                                        <th>Resi</th>
                                        <th>Pelanggan</th>
                                        <th>Status</th>
                                        <th>Layanan</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <For each={pesanan()}>
                                        {(item, index) => (
                                            <tr class="*:first:border-l *:border-black/20 *:border-b *:last:border-r">
                                                <td>{item.no_resi}</td>
                                                <td>{item.nama_pelanggan}</td>
                                                <td>
                                                    <span
                                                        class={`w-full font-semibold py-4 badge badge-primary rounded-full border-0 ${statusStyle[item.status_proses]}`}
                                                    >
                                                        {item.status_proses
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            item.status_proses.slice(
                                                                1,
                                                            )}
                                                    </span>
                                                </td>
                                                <td>{item.nama_layanan}</td>
                                                <td>
                                                    <A
                                                        href="/pesanan/detail"
                                                        state={item}
                                                        class="btn btn-primary w-full"
                                                    >
                                                        Detail
                                                    </A>
                                                </td>
                                            </tr>
                                        )}
                                    </For>
                                </tbody>
                            </table>
                        </div>
                    </Show>
                </Show>
            </div>
        </main>
    );
}
