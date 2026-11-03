import { WebsiteBreadcrumb } from "@/src/features/website/components/website-breadcrumb";
import { WebsiteFooter } from "@/src/features/website/components/website-footer";
import { WebsiteMenu } from "@/src/features/website/components/website-menu";
import {
  legalChrome,
  type LegalDocument as LegalDocumentContent,
} from "@/src/features/website/locales/legal";

function LegalText({ text }: { text: string }) {
  const email = legalChrome.supportEmail;
  const parts = text.split(email);
  if (parts.length === 1) return text;

  return parts.flatMap((part, index) => {
    const nodes = [<span key={`text-${index}`}>{part}</span>];
    if (index < parts.length - 1) {
      nodes.push(
        <a
          key={`email-${index}`}
          href={`mailto:${email}`}
          className="text-[#1a1c1d] underline transition-colors hover:text-[#655d55]"
        >
          {email}
        </a>,
      );
    }
    return nodes;
  });
}

export function LegalDocument({ document }: { document: LegalDocumentContent }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f9f9fb] text-[#1a1c1d] antialiased">
      <WebsiteMenu />
      <main className="w-full px-6 pt-10 pb-16 sm:pt-12 sm:pb-20">
        <article className="mx-auto max-w-3xl space-y-10">
          <div className="border-b border-[#c5c6c9]/30 pb-8">
            <WebsiteBreadcrumb current={document.title} />
            <div className="mt-8 space-y-4">
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#1a1c1d] sm:text-4xl lg:text-5xl">
                {document.title}
              </h1>
              <div className="flex flex-col gap-2 text-sm text-[#655d55] sm:flex-row sm:items-center sm:gap-6">
                <p>
                  <span className="font-medium text-[#1a1c1d]">{legalChrome.effectiveDate}</span>{" "}
                  {document.effectiveDate}
                </p>
                <span className="hidden text-[#c5c6c9] sm:inline" aria-hidden>
                  •
                </span>
                <p>
                  <span className="font-medium text-[#1a1c1d]">{legalChrome.lastUpdated}</span>{" "}
                  {document.lastUpdated}
                </p>
              </div>
            </div>
          </div>
          <p className="text-base leading-relaxed text-[#44474a] sm:text-lg">{document.intro}</p>
          {document.sections.map((section) => (
            <section key={section.title} className="space-y-3 pt-2">
              <h2 className="font-serif text-xl font-semibold text-[#1a1c1d] sm:text-2xl">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-[#44474a]">
                  <LegalText text={paragraph} />
                </p>
              ))}
              {section.items ? (
                <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-[#44474a]">
                  {section.items.map((item) => (
                    <li key={`${item.label}${item.text}`}>
                      {item.label ? (
                        <>
                          <strong className="font-medium text-[#1a1c1d]">{item.label}</strong>{" "}
                        </>
                      ) : null}
                      <LegalText text={item.text} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.contacts ? (
                <div className="space-y-1.5 pt-1 text-base text-[#44474a]">
                  {section.contacts.map((contact) => (
                    <p key={contact.label}>
                      <strong className="font-medium text-[#1a1c1d]">{contact.label}</strong>{" "}
                      {contact.href ? (
                        <a
                          href={contact.href}
                          className="text-[#1a1c1d] underline transition-colors hover:text-[#655d55]"
                        >
                          {contact.value}
                        </a>
                      ) : (
                        contact.value
                      )}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </article>
      </main>
      <WebsiteFooter />
    </div>
  );
}
