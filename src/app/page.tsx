// Placeholder landing screen. It exists so the scaffold renders something
// coherent; none of these areas are built yet.

const areas = [
  {
    name: "Recipe box",
    detail: "Save recipes with ingredients, servings and timings.",
  },
  {
    name: "Weekly planner",
    detail: "Assign recipes to breakfast, lunch and dinner across the week.",
  },
  {
    name: "Grocery list",
    detail: "Roll the week's ingredients up into one shopping list.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
          Scaffold
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Meal Magic</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Project setup is in place. Features come next.
        </p>
      </header>

      <ul className="flex flex-col gap-4">
        {areas.map((area) => (
          <li
            key={area.name}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
          >
            <h2 className="font-semibold">{area.name}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {area.detail}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
