import { Construction } from '../icons';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-[34px] font-semibold leading-tight text-brand-deep">
          {title}
        </h1>
      </div>
      <section className="animate-rise rounded-[14px] border border-line bg-card px-8 py-16 text-center">
        <Construction size={30} className="mx-auto mb-4 block text-brand" />
        <h2 className="mb-1 font-display text-xl font-semibold">Em construção</h2>
        <p className="text-sm text-ink-soft">
          Esta área ainda não foi implementada. O item já existe no menu pra validar a navegação
          do shell.
        </p>
      </section>
    </>
  );
}
