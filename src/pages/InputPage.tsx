import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import type { WorkBook } from 'xlsx';
import { fmtDateTime, fmtNum, fmtPct, fmtRp } from '../logic/format';
import { DEFAULT_DATA_SHEET, ParseError, parseWorkbook, readWorkbook } from '../logic/parseExcel';
import { findMismatches } from '../logic/rules';
import { useData } from '../state/DataContext';

export default function InputPage() {
  const { dataset, partners, persisted, setDataset, clear } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Bila sheet "Data Dummy" tidak ada, pengguna memilih sheet lain (FR-01).
  const [pending, setPending] = useState<{ wb: WorkBook; fileName: string } | null>(null);

  const mismatches = useMemo(() => findMismatches(partners), [partners]);

  function load(wb: WorkBook, fileName: string, sheet: string) {
    try {
      setDataset(parseWorkbook(wb, fileName, sheet));
      setPending(null);
      setError(null);
    } catch (e) {
      setError(e instanceof ParseError ? e.message : `Gagal membaca file: ${(e as Error).message}`);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPending(null);
    if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
      setError('File harus berformat Excel (.xlsx).');
      return;
    }
    setBusy(true);
    try {
      const wb = readWorkbook(await file.arrayBuffer());
      if (wb.SheetNames.includes(DEFAULT_DATA_SHEET)) load(wb, file.name, DEFAULT_DATA_SHEET);
      else setPending({ wb, fileName: file.name });
    } catch (e) {
      setError(e instanceof ParseError ? e.message : `Gagal membaca file: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="input-page">
      <section className="card">
        <h2 className="card__title">Upload File Excel</h2>
        <p className="muted">
          Data partner dibaca dari sheet <b>{DEFAULT_DATA_SHEET}</b>, aturan klasifikasi dari sheet <b>Parameter Dummy</b>.
          File hanya diproses di browser ini dan tidak dikirim ke mana pun.
        </p>
        <div
          className={`dropzone${dragOver ? ' is-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <b>{busy ? 'Membaca file…' : 'Tarik & lepas file .xlsx di sini'}</b>
            <span>atau klik untuk memilih file</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm,.xls"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {pending && (
          <div className="alert alert--warn">
            Sheet <b>{DEFAULT_DATA_SHEET}</b> tidak ada di <b>{pending.fileName}</b>. Pilih sheet yang berisi data partner:
            <div className="sheet-pick">
              {pending.wb.SheetNames.map((s) => (
                <button key={s} className="btn btn--ghost" onClick={() => load(pending.wb, pending.fileName, s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {dataset && (
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Data Aktif</h2>
            <div className="actions">
              <button className="btn btn--ghost" onClick={clear}>
                Hapus data
              </button>
              <Link className="btn btn--primary" to="/">
                Lihat Dashboard →
              </Link>
            </div>
          </div>

          <dl className="summary">
            <div><dt>File</dt><dd>{dataset.fileName}</dd></div>
            <div><dt>Sheet</dt><dd>{dataset.sheetName}</dd></div>
            <div><dt>Diupload</dt><dd>{fmtDateTime(dataset.loadedAt)}</dd></div>
            <div><dt>Partner terbaca</dt><dd>{dataset.inputs.length}</dd></div>
            <div><dt>Parameter</dt><dd>{dataset.paramsFromFile ? 'Dari sheet Parameter Dummy' : 'Default'}</dd></div>
            <div>
              <dt>Cek hasil hitung vs Excel</dt>
              <dd className={mismatches.length ? 'text-warn' : 'text-ok'}>
                {mismatches.length ? `${mismatches.length} partner berbeda` : '✓ 0 selisih'}
              </dd>
            </div>
          </dl>

          {!persisted && (
            <div className="alert alert--warn">
              Data tidak bisa disimpan di browser, jadi akan hilang saat halaman di-refresh.
            </div>
          )}

          {dataset.warnings.length > 0 && (
            <details className="alert alert--warn" open={dataset.warnings.length <= 5}>
              <summary>{dataset.warnings.length} peringatan validasi</summary>
              <ul>
                {dataset.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </details>
          )}

          {mismatches.length > 0 && (
            <details className="alert alert--warn">
              <summary>
                {mismatches.length} partner: kolom turunan di Excel berbeda dengan hasil hitung aplikasi (dashboard memakai hasil hitung aplikasi)
              </summary>
              <ul>
                {mismatches.slice(0, 50).map((m) => <li key={m.name}>{m.name}: {m.fields.join(', ')}</li>)}
              </ul>
            </details>
          )}

          <h3 className="subhead">Pratinjau 10 baris pertama</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Baris</th><th>Nama Partner</th><th className="num">FBI</th><th className="num">Percentage</th>
                  <th>PJP</th><th>Inti</th><th>Data Pribadi</th><th className="num">Skor</th><th>Domain 0</th>
                  <th>Kritikal/Non</th><th>Profil Risiko</th><th>Kuadran</th>
                </tr>
              </thead>
              <tbody>
                {partners.slice(0, 10).map((p) => (
                  <tr key={p.name}>
                    <td className="muted">{p.row}</td>
                    <td>{p.name}</td>
                    <td className="num">{fmtRp(p.fbi)}</td>
                    <td className="num">{fmtPct(p.pct, 2)}</td>
                    <td>{p.pjp ? 'Ya' : 'Tidak'}</td>
                    <td>{p.intiPembayaran ? 'Ya' : 'Tidak'}</td>
                    <td>{p.dataPribadi ? 'Ya' : 'Tidak'}</td>
                    <td className="num">{fmtNum(p.skor)}</td>
                    <td>{p.domain0 ? 'Ya' : 'Tidak'}</td>
                    <td>{p.kelompok}</td>
                    <td>{p.profil}</td>
                    <td>{p.kuadran}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
