import { Contact, Globe, LayoutDashboard, Mail } from 'lucide-react';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Globe, label: 'Website' },
  { icon: Contact, label: 'Buyers' },
  { icon: Mail, label: 'Campaigns' }
];

const rows = [
  { name: 'Ganges Textiles', country: 'United States', value: '₹4,20,000' },
  { name: 'Nirvana Spices', country: 'Germany', value: '₹2,15,000' },
  { name: 'Coastal Cashews', country: 'UAE', value: '₹1,80,000' },
  { name: 'Aryan Agri', country: 'United Kingdom', value: '₹95,000' }
];

export function AppMockup() {
  return (
    <div className="relative mx-auto mt-20 max-w-4xl">
      <div className="pointer-events-none absolute -inset-x-8 -top-10 bottom-0 rounded-[2rem] bg-slate-800/40 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/90 shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <div className="ml-4 h-6 flex-1 max-w-xs rounded-md bg-slate-800" />
        </div>
        <div className="flex">
          <aside className="hidden w-52 border-r border-slate-800 p-4 sm:block">
            <div className="h-7 w-24 rounded-md bg-slate-800" />
            <div className="mt-6 space-y-3">
              {sidebarItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    item.active ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
              ))}
            </div>
          </aside>
          <div className="flex-1 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded-md bg-slate-800" />
              <div className="h-7 w-20 rounded-lg bg-primary/90" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((cell) => (
                <div key={cell} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="h-2.5 w-16 rounded bg-slate-800" />
                  <div className="mt-2 h-4 w-20 rounded bg-slate-700" />
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {[45, 70, 55, 85, 60, 90, 50, 75, 40, 65].map((height, i) => (
                <div key={i} className="flex h-20 items-end">
                  <div
                    className="w-full rounded-t-md bg-slate-700"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {rows.map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2.5">
                  <div>
                    <div className="text-xs font-medium text-slate-200">{row.name}</div>
                    <div className="text-[10px] text-slate-500">{row.country}</div>
                  </div>
                  <span className="text-xs font-semibold text-primary">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}