# 8-Puzzle Solver

## About the Game

8-Puzzle adalah permainan pada papan berukuran 3×3 yang terdiri dari delapan ubin bernomor dan satu ruang kosong. Permainan ini diselesaikan dengan menyusun ubin sesuai urutan angka dengan menggeser ubin ke ruang kosong.

## Algorithm Used

Algoritma yang digunakan untuk menyelesaikan puzzle ini adalah **A* (A-Star Search)**.

A* mencari solusi dengan mengevaluasi kondisi puzzle menggunakan rumus:

`f(n) = g(n) + h(n)`

- `g(n)`: jumlah langkah yang sudah dilakukan.
- `h(n)`: perkiraan jarak menuju kondisi akhir dihitung menggunakan **Manhattan Distance**.

A* menggunakan kedua nilai tersebut untuk menentukan kondisi puzzle yang akan diperiksa selanjutnya sehingga menemukan solusi.

## How to Run

1. Download atau clone repository ini.
2. Buka file `index.html` menggunakan browser.
