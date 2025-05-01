import type { LayoutSync } from "~/stack/types.ts";
import type { ReactElement } from "react";

export const layout: LayoutSync = ({ Page }): ReactElement => {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Root Layout</title>

                {/* 'Inter' font */}
                <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" crossOrigin="anonymous" />

                {/* TODO: Move to Tailwind file */}
                <style>{`
                    html, body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Inter', sans-serif, system-ui;
                        /* Add other base styles */
                    }
                    #app {
                        /* Styles for the main app container if needed */
                    }
                `}</style>
            </head>
            <body>
                <div id="app">
                    <Page />
                </div>
            </body>
        </html>
    );
}
