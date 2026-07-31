import { PKHRecord, Warga } from "../types";

export const dummyKecamatan: Record<string, PKHRecord> = {
  "Purwakarta": { jumlah: 8500, penduduk: 130000 },
  "Campaka": { jumlah: 4200, penduduk: 55000 },
};

export const dummyDesa: Record<string, PKHRecord> = {
  "Munjuljaya": { jumlah: 11, penduduk: 15000 },
  "Nagri Kidul": { jumlah: 650, penduduk: 11500 },
  "Campaka": { jumlah: 350, penduduk: 4500 }
};

export const dummyMasyarakat: Record<string, Warga[]> = {
  "Munjuljaya": [
    {    
      nama: "ACEM",
      alamat: "KP PANGUPUKAN RT 001 RW 001",
      aud: 0,
      sd: 0,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 1,
      kategoriGraduasi: "Sedang"
    },
    {

      nama: "ADI",
      alamat: "KP. PANGUPUKAN RT 004 RW 001",
      aud: 1,
      sd: 1,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 0,
      kategoriGraduasi: "Rendah"
    },
    {

      nama: "ANI SURYANI",
      alamat: "KP PANGUPUKAN RT 003 RW 001",
      aud: 1,
      sd: 0,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 0,
      kategoriGraduasi: "Rendah"
    },
    {

      nama: "AWID",
      alamat: "KP. PANGUPUKAN RT 003 RW 001",
      aud: 0,
      sd: 0,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 1,
      kategoriGraduasi: "Sedang"
    },
    {

      nama: "DIDI AHDI",
      alamat: "KP. SUKAMAJU RT 005 RW 001",
      aud: 0,
      sd: 0,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 2,
      kategoriGraduasi: "Sedang"
    },
    {

      nama: "DOCE",
      alamat: "KP PANGUPUKAN RT 004 RW 001",
      aud: 0,
      sd: 1,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 2,
      kategoriGraduasi: "Rendah"
    },
    {
      
      nama: "E KARTINI",
      alamat: "KP SUKAMAJU RT 005 RW 001",
      aud: 0,
      sd: 0,
      smp: 0,
      sma: 1,
      disabilitas: 0,
      lansia: 1,
      kategoriGraduasi: "Tinggi"
    },
    {
      nama: "EMAY",
      alamat: "KP. SUKAMAJU RT 005 RW 001",
      aud: 0,
      sd: 0,
      smp: 1,
      sma: 0,
      disabilitas: 0,
      lansia: 0,
      kategoriGraduasi: "Sedang"
    },
    {

      nama: "EMIN",
      alamat: "KP SUKAMAJU RT 005 RW 001",
      aud: 0,
      sd: 0,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 1,
      kategoriGraduasi: "Sedang"
    },
    {

      nama: "ENTI",
      alamat: "KP PANGUPUKAN RT 003 RW 001",
      aud: 0,
      sd: 1,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 0,
      kategoriGraduasi: "Rendah"
    },
    {

      nama: "ENTIR",
      alamat: "KP SUKAMAJU RT 005 RW 001",
      aud: 0,
      sd: 0,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 1,
      kategoriGraduasi: "Sedang"
    }
  ],
  "Nagri Kidul": [
    {

      nama: "Budi Santoso",
      alamat: "Jl. Mawar No. 10",
      aud: 0,
      sd: 0,
      smp: 0,
      sma: 0,
      disabilitas: 0,
      lansia: 0,
      kategoriGraduasi: "Rendah"
    }
  ]
};