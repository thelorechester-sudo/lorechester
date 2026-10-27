"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/admin/ui";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "./actions";

type Status =
  | "checking"
  | "needs-install" // iPhone/iPad, but not opened from the Home Screen
  | "unsupported"
  | "blocked" // permission denied
  | "off"
  | "on";

const SW_SCOPE = "/admin";

function urlBase64ToUint8Array(base64: string) {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export function PushToggle({
  publicKey,
  devicesOnServer,
}: {
  publicKey: string;
  devicesOnServer: number;
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let next: Status;
      if (isIos() && !isStandalone()) next = "needs-install";
      else if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window))
        next = "unsupported";
      else if (Notification.permission === "denied") next = "blocked";
      else next = (await currentSubscription()) ? "on" : "off";

      if (!cancelled) setStatus(next);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setMessage(null);
    // Must be the first await in the tap: iOS only shows the permission
    // prompt while the tap's user activation is still live.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus(permission === "denied" ? "blocked" : "off");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: SW_SCOPE,
      });
      await navigator.serviceWorker.ready;

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const result = await savePushSubscription(
        subscription.toJSON(),
        navigator.userAgent,
      );
      if (!result.ok) {
        await subscription.unsubscribe();
        setMessage(result.message ?? "Could not save this device.");
        return;
      }
      setStatus("on");
      setMessage("Alerts are on for this device.");
    } catch (error) {
      console.error(error);
      setMessage("Could not turn alerts on. Try again, or reopen the app.");
    }
  }

  async function turnOff() {
    setMessage(null);
    const subscription = await currentSubscription();
    if (subscription) {
      await removePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setStatus("off");
    setMessage("Alerts are off for this device.");
  }

  const box = "rounded-lg border border-line bg-paper-pure p-5 space-y-4";

  if (status === "checking") {
    return <div className={box}><p className="text-sm text-muted">Checking this device…</p></div>;
  }

  if (status === "needs-install") {
    return (
      <div className={box}>
        <p className="text-sm font-medium">Add the admin to your Home Screen first</p>
        <p className="text-sm text-muted">
          This iPhone only allows alerts from the Home Screen app. Follow the
          steps on the right, then open this page from <strong className="text-ink">LC Admin</strong>.
        </p>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className={box}>
        <p className="text-sm font-medium">This browser can’t receive alerts</p>
        <p className="text-sm text-muted">
          Use Safari on iOS 16.4+ (from the Home Screen), or a current Chrome,
          Edge or Firefox.
        </p>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className={box}>
        <p className="text-sm font-medium">Notifications are blocked</p>
        <p className="text-sm text-muted">
          Allow notifications for LC Admin in your phone’s Settings → Notifications
          (or your browser’s site settings), then reload this page.
        </p>
      </div>
    );
  }

  return (
    <div className={box}>
      <div>
        <p className="text-sm font-medium">
          {status === "on" ? "Alerts are on for this device" : "Alerts are off for this device"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {devicesOnServer} device{devicesOnServer === 1 ? "" : "s"} currently receive your alerts.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "off" ? (
          <Button type="button" disabled={pending} onClick={() => startTransition(turnOn)}>
            Turn on order alerts
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await sendTestPush();
                  setMessage(result.message ?? null);
                })
              }
            >
              Send a test
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => startTransition(turnOff)}>
              Turn off
            </Button>
          </>
        )}
      </div>

      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
