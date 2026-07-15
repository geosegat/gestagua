import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-[34px] font-semibold leading-tight text-brand-deep">
          {title}
        </h1>
      </div>
      <section className="animate-rise rounded-[14px] border border-line bg-card px-8 py-16 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand-soft">
          <Construction size={22} className="text-brand" />
        </div>
        <h2 className="mb-1 font-display text-xl font-semibold">Em construção</h2>
        <p className="text-sm text-ink-soft">
          Esta área ainda não foi implementada — o item já existe no menu pra validar a navegação
          do shell.
        </p>
      </section>
    </>
  );
}
