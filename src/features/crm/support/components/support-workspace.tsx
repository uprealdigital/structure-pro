import { Mail, Phone } from "lucide-react";
import { copy } from "@/src/features/crm/support/locales/en";

const channels = [
  {
    title: copy.phoneTitle,
    body: copy.phoneBody,
    action: copy.phoneAction,
    href: copy.phoneHref,
    icon: Phone,
  },
  {
    title: copy.emailTitle,
    body: copy.emailBody,
    action: copy.emailAction,
    href: copy.emailHref,
    icon: Mail,
  },
] as const;

export function SupportWorkspace() {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[#f9f9fb]">
      <div className="w-full max-w-7xl flex-1 space-y-6 p-8">
        <section>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 pt-4 md:grid-cols-2">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <article
                  key={channel.href}
                  className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-8 shadow-sm transition-colors hover:border-gray-300"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-800">
                        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="font-serif text-xl font-bold tracking-tight text-gray-950">
                        {channel.title}
                      </h2>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-500">{channel.body}</p>
                  </div>
                  <div className="mt-8 border-t border-gray-100 pt-5">
                    <a
                      href={channel.href}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-xs transition-colors hover:bg-gray-100"
                    >
                      {channel.action}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
