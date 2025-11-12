import Link from 'next/link';

export default function Home() {
  const sections = [
    {
      href: '/gallery',
      label: 'Gallery',
      gradient: 'from-purple-900 to-indigo-900',
    },
    {
      href: '/writing',
      label: 'Writing',
      gradient: 'from-blue-900 to-cyan-900',
    },
    {
      href: '/projects',
      label: 'Projects',
      gradient: 'from-emerald-900 to-teal-900',
    },
    {
      href: '/book',
      label: 'Book',
      gradient: 'from-rose-900 to-pink-900',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-4xl w-full aspect-square">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${section.gradient} hover:scale-[1.02] transition-transform duration-300 shadow-xl hover:shadow-2xl`}
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="relative h-full flex items-center justify-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
                {section.label}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
