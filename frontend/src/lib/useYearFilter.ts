import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'gestagua_reference_year';

function validYear(value: string | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 1900 && year <= 2100 ? year : null;
}

export function useYearFilter(): {
  year: number | null;
  setYear: (year: number | null) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryYear = validYear(searchParams.get('ano'));
  const storedYear = validYear(window.localStorage.getItem(STORAGE_KEY));
  const year = queryYear ?? storedYear;

  function setYear(nextYear: number | null) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextYear === null) {
      nextParams.delete('ano');
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      nextParams.set('ano', String(nextYear));
      window.localStorage.setItem(STORAGE_KEY, String(nextYear));
    }

    setSearchParams(nextParams, { replace: true });
  }

  return { year, setYear };
}
