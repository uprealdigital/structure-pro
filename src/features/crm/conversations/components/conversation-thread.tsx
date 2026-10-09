import { Phone } from "lucide-react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { Activity, ActivityChannel } from "@/src/features/crm/conversations/types";
import { formatCallDuration, formatMessageClock, formatMessageDay } from "@/src/features/crm/conversations/utils/formatting";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

function AiStar() {
  return (
    <svg className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function activityChannelLabel(channel: ActivityChannel): string {
  switch (channel) {
    case "call":
      return copy.channelCall;
    case "sms":
      return copy.channelSms;
    case "facebook":
      return copy.channelFacebook;
    case "email":
      return copy.channelEmail;
    case "telegram":
      return copy.channelTelegram;
  }
}

function isCall(channel: ActivityChannel): boolean {
  return channel === "call";
}

function callDirectionLabel(activity: Activity): string {
  if (activity.call?.direction === "outbound") return copy.outboundCall;
  if (activity.call?.direction === "inbound") return copy.inboundCall;
  return copy.channelCall;
}

function CallActivity({ activity }: { activity: Activity }) {
  const duration = formatCallDuration(activity.call?.durationSeconds);
  const directionLabel = callDirectionLabel(activity);
  const label = duration ? `${directionLabel} (${duration})` : directionLabel;
  const clock = activity.createdAt ? formatMessageClock(activity.createdAt) : "";
  const highMatch = (activity.call?.scriptMatch ?? 0) >= 70;
  const matchClass = highMatch ? "text-emerald-700" : "text-red-600";
  const dotClass = highMatch ? "bg-emerald-500" : "bg-red-500";

  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-700 shadow-xs">
        <Phone className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
        <span className="font-medium text-gray-800">{label}</span>
        {activity.call?.scriptMatch != null ? (
          <span className={`inline-flex items-center gap-1 font-medium ${matchClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
            {activity.call.scriptMatch}% {copy.scriptMatch}
          </span>
        ) : null}
        <button type="button" className="font-medium text-gray-500">
          {copy.details}
          <span aria-hidden="true"> ›</span>
        </button>
      </div>
      {clock ? (
        <span className="text-[10px] text-gray-400">
          {clock} • {callDirectionLabel(activity)}
        </span>
      ) : null}
    </div>
  );
}

export function ConversationThread({
  activities,
  contactName,
}: {
  activities: Activity[];
  contactName: string;
}) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-xs text-gray-500">
        {copy.noMessages}
      </div>
    );
  }

  const operatorInitials = contactInitials(copy.operatorName);
  const rows = activities.reduce<
    Array<{
      key: string;
      activity: Activity;
      fromCustomer: boolean;
      showDay: boolean;
      day: string;
      stamp: string;
    }>
  >((items, activity, index) => {
    const fromCustomer = activity.role === "user";
    const day = activity.createdAt ? formatMessageDay(activity.createdAt) : "";
    const previousDay = items.findLast((item) => item.day)?.day ?? "";
    const clock = activity.createdAt ? formatMessageClock(activity.createdAt) : "";
    const channelLabel = activityChannelLabel(activity.channel);
    const stamp = !clock
      ? ""
      : activity.generatedBy === "ai" && activity.channel === "sms"
        ? `${clock} • ${copy.sentViaAi}`
        : `${clock} • ${copy.viaChannel} ${channelLabel}`;
    items.push({
      key: `${index}-${activity.channel}-${activity.role}`,
      activity,
      fromCustomer,
      showDay: Boolean(day) && day !== previousDay,
      day,
      stamp,
    });
    return items;
  }, []);

  return (
    <ol className="flex flex-col gap-4 px-6 py-5" aria-label={copy.messages}>
      {rows.map((row) => {
        const { activity, fromCustomer, showDay, day, stamp } = row;

        return (
          <li key={row.key} className="flex flex-col gap-4">
            {showDay ? (
              <div className="my-2 flex items-center justify-center">
                <span className="rounded-full bg-gray-200/60 px-3 py-1 text-[11px] font-medium text-gray-400">
                  {day}
                </span>
              </div>
            ) : null}
            {isCall(activity.channel) ? (
              <CallActivity activity={activity} />
            ) : fromCustomer ? (
              <div className="flex max-w-xl items-start">
                <span className="mr-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 font-serif text-[10px] font-bold text-gray-700">
                  {contactInitials(contactName)}
                </span>
                <div>
                  <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-3.5 text-xs text-gray-800 shadow-xs">
                    <p className="leading-relaxed whitespace-pre-wrap">{activity.text}</p>
                  </div>
                  {stamp ? <span className="mt-1 block pl-1 text-[10px] text-gray-400">{stamp}</span> : null}
                </div>
              </div>
            ) : (
              <div className="ml-auto flex max-w-xl items-start justify-end">
                <div className="min-w-0 text-right">
                  <div className="rounded-2xl rounded-tr-sm bg-[#121314] p-3.5 text-left text-xs text-white shadow-xs">
                    <p className="leading-relaxed whitespace-pre-wrap">{activity.text}</p>
                  </div>
                  {stamp ? (
                    <div className="mt-1 flex items-center justify-end gap-2 pr-1">
                      <span className="text-[10px] text-gray-400">{stamp}</span>
                    </div>
                  ) : null}
                </div>
                <div className="ml-2.5 flex shrink-0 flex-col items-center">
                  <div className="relative">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 font-serif text-[10px] font-bold text-white">
                      {operatorInitials}
                    </div>
                    {activity.generatedBy === "ai" ? (
                      <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-white bg-purple-50 text-purple-700">
                        <AiStar />
                      </span>
                    ) : null}
                  </div>
                  {activity.generatedBy === "ai" ? (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap text-purple-700">
                      <AiStar />
                      {copy.ai}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
