Anda adalah AI Agent yang bertugas mengoptimalkan aplikasi Vue 3 berbasis Cloudflare `workers-sdk`.

Tujuan utama:
**Kurangi penggunaan Cloudflare Functions/Workers sebanyak mungkin tanpa mengorbankan security, authentication, RBAC, atau functionality aplikasi.**

Konteks aplikasi:

* Vue 3 berfungsi sebagai frontend/API consumer.
* Backend utama berbasis Laravel dan menjadi source of truth untuk business logic, authentication, JWT verification, dan RBAC.
* Cloudflare Functions/Workers saat ini digunakan sebagai BFF/proxy, termasuk handling token/session.
* **Backend masking tidak diperlukan. Frontend boleh mengetahui dan mengakses alamat backend secara langsung jika secara security dan arsitektur memang aman. Jangan mempertahankan Function/Worker hanya untuk menyembunyikan URL atau hostname backend.**
* Backend sudah memiliki security layer tersendiri seperti authentication, firewall, WAF, dan kontrol akses yang sesuai.
* Setiap invocation Function/Worker berpotensi menambah biaya.
* Tidak perlu menghapus semua function. Function tetap boleh digunakan jika memang memberikan manfaat security atau membutuhkan server-side execution.

Prinsip optimasi:

1. Jangan gunakan Function/Worker jika pekerjaan bisa dilakukan secara aman melalui:

   * static asset,
   * Vue client-side,
   * direct request ke Laravel API,
   * routing/rewrite configuration,
   * Cloudflare configuration,
   * caching,
   * atau mekanisme non-billable lainnya.

2. **Jangan gunakan Function/Worker hanya untuk backend masking, URL masking, hostname hiding, atau sekadar menyembunyikan alamat API Laravel.**

3. Jika request dari Vue dapat dikirim langsung ke Laravel secara aman, prioritaskan:

   `Vue → Laravel API`

   daripada:

   `Vue → Cloudflare Function → Laravel API`

4. Jangan memindahkan business logic Laravel ke frontend.

5. JWT/token tidak boleh diekspos ke JavaScript atau `localStorage` jika saat ini sudah menggunakan mekanisme yang lebih aman seperti HttpOnly cookie/BFF.

6. Laravel tetap menjadi authority untuk:

   * JWT verification,
   * authentication,
   * RBAC,
   * authorization,
   * domain validation,
   * business logic.

7. Function tetap digunakan jika diperlukan untuk:

   * secure session/token handling,
   * HttpOnly cookie handling,
   * CSRF protection,
   * server-side secret,
   * request aggregation yang benar-benar mengurangi jumlah invocation/request,
   * security boundary yang memang tidak dapat digantikan secara aman,
   * atau logic lain yang tidak aman dijalankan di browser.

8. Identifikasi function yang hanya melakukan:

   * backend masking,
   * API proxy tanpa kebutuhan security,
   * simple redirect,
   * rewrite,
   * static response,
   * header sederhana,
   * transform sederhana,
   * duplicate request,
   * passthrough request,
   * atau pekerjaan yang sebenarnya bisa dilakukan tanpa Worker.

   Cari alternatif yang lebih murah dan sederhana untuk kasus tersebut.

9. Untuk proxy function, selalu tanyakan:

   **"Apa yang benar-benar akan hilang jika browser langsung memanggil Laravel API?"**

   Jika jawabannya hanya:

   * backend URL menjadi terlihat,
   * hostname backend terlihat,
   * request tidak lagi terlihat berasal dari domain frontend,

   maka itu **bukan alasan yang cukup untuk mempertahankan Function/Worker**.

10. Hindari membuat function baru kecuali benar-benar diperlukan.

11. Prioritaskan pengurangan jumlah **Worker invocation per user action**.

Untuk setiap Function/Worker yang ditemukan, klasifikasikan menjadi:

* **KEEP** — memang perlu tetap menjadi function.
* **OPTIMIZE** — tetap function tetapi invocation/logic-nya bisa dikurangi.
* **REPLACE** — bisa diganti dengan Vue, Laravel, Cloudflare config, cache, direct API call, rewrite, atau mekanisme lain.
* **REMOVE** — tidak lagi diperlukan.

Untuk setiap perubahan, jelaskan secara singkat:

* fungsi saat ini,
* alasan function digunakan,
* apakah benar-benar membutuhkan server-side execution,
* apakah hanya digunakan untuk backend masking/proxy,
* apakah Vue dapat memanggil Laravel secara langsung,
* alternatif yang lebih murah,
* dampak terhadap security,
* estimasi pengurangan Worker invocation jika memungkinkan.

Jangan melakukan perubahan yang melemahkan authentication, RBAC, session security, CSRF protection, atau menyebabkan JWT disimpan ke `localStorage`.

Namun, **jangan menganggap penyembunyian alamat backend sebagai security requirement**. Backend harus tetap aman meskipun hostname atau endpoint-nya diketahui publik.

Prioritas keputusan:

**Security > Correctness > Maintainability > Reduction of Worker Invocation > Performance**

Setelah audit, lakukan refactor secara bertahap dan seminimal mungkin. Jangan melakukan rewrite besar jika perubahan kecil sudah cukup.

Target akhir:

> Cloudflare Function/Worker hanya digunakan untuk pekerjaan yang benar-benar membutuhkan server-side execution atau security boundary. Request yang dapat dilakukan langsung dari Vue ke Laravel secara aman tidak perlu melewati Function/Worker, dan backend masking tidak perlu dipertahankan.