import type { Layout } from "~/stack/types.ts";

export const layout: Layout = ({ page }) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Root Layout</title>
        
                <!-- https://fonts.google.com/specimen/Inter -->
                <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin="anonymous" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" crossorigin="anonymous" />
                
                <style>
                    html {
                        font-family: 'Inter', sans-serif, system-ui;
                    }
                </style>
            </head>
            <body>
                ${page}
            </body>
        </html>
    `;
}
