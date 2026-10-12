import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VetEstudo" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAwADADASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAAAwUGBAIH/8QAMhAAAgIBAwIEAwYHAQAAAAAAAQIDBBEABRIhMQYTQVEiYXEHFBUjMqEzQ3KBgqLB4f/EABcBAAMBAAAAAAAAAAAAAAAAAAABAgP/xAAcEQADAQACAwAAAAAAAAAAAAAAAhEBAyESIlH/2gAMAwEAAhEDEQA/APXNCs2I6teSeXl5calm4qWOPoOp0TtqR3DdPvsxJaMxISUhkYhI1H82XHXqcBV9c/U6CGaCvc/tGtWFdfD+2SOgJX7zZHFc/IZH7n+2uts+0eeHy49/2yWLmQosVhzVj9Ov7E/TQt78Lw7puE+4bi7XIq/GKcU0MRiHENyVSWDgBgSOh+vYl2zw7B4U3UTbPOdxa/XYV67kKRjDeYWHTiB64zkgDvq+jOvS8rWYrdeOeBuUUihlJBGQfkeo0XUbsl6pBSFjarFixFTVI7qzA5ORnPb9ajvj21YqwZQynIIyCPXUGitTBvkfnbHfj8xoucDjmpIK9O/T20o2bcoNqqU9vm261RQKsfnTANGznoMSLkEk+px/zVJJGssbxuMq4Kke4Opa/t9zcoK+xSyNBHGS7WAP4ipgx4/ywT/QffTE1zQG4WbO1Nbp2pYtvq3bTudxeVclGA+FF78wBjJGABn5aJ4amobfJPUNuG5u4BX8v1iTARFIGOi8SVHqSdc7vfuIK881SaHcIEeFxHA0qOr4y8bAEd1BwcHGR30XwxQkkWrMWrCnV5tBHX44DMMHt2wM9D1yx9tBN9pgXzI/xiLEyNPMskV6FnVjFGRleRUAZBwBn0c6b7GXOy0/MzyEYHXv06alBTmv2JNppcJUq25ZXn5fl8X+IciM5kyxXHsCTjI1ZbfVNKhBXaQyGNApb3/80aNbrUlPFPiG94b3WVjKz1blNhVTiPgsKQAO3qCD10mPjXfINrtwCAPYqRyI9uQZZZExyYjHH1IA9Ome+vRbVKvcCfeIIpTG3OMyIG4N7jPrrG2xVXsyWSsYsSqVeRYI+TA9wSVJI0XBsrXrSfq71fktSSzWQ/lokgjhnjWJj5YOPi6kE+2s9u5BcnNqxtu3y4hdpFZcMzBgOpxknqOnXT29sUke3TLtvk+eExCGhjTHyDBenTp211t2zT/hlWO+8azRoQyxxIwGe4BK+3y66Rj4cn0U29+aKvYpbdDBVjgYhXibj8IcAcABgk566a7d4hku7hFC0EaxT+Z5fGTLrwODyHpnWwbJWAUEKwXJAeGMgf661xU68MrTJBEsz/rkVAC310FqnJbun//Z", type: "image/jpeg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
