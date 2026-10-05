import { NavLink } from 'react-router-dom';
import { fmtDateTime } from '../logic/format';
import { useData } from '../state/DataContext';

export default function Header() {
  const { dataset } = useData();
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <img className="app-header__logo" src={`${import.meta.env.BASE_URL}logo-bri-putih.png`} alt="BRI" />
        <div className="app-header__title">
          <h1>Dashboard Kritikalitas &amp; Risiko Partner</h1>
          <span>BRIAPI 2026</span>
        </div>
        <nav className="app-header__nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/input">Input Data</NavLink>
        </nav>
        <div className="app-header__meta">
          {dataset ? (
            <>
              <span title={dataset.fileName}>
                {dataset.fileName} · <b>{dataset.sheetName}</b>
              </span>
              <span>Diupload {fmtDateTime(dataset.loadedAt)}</span>
            </>
          ) : (
            <span>Belum ada data</span>
          )}
        </div>
      </div>
    </header>
  );
}
