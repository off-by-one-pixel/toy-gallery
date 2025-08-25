import { Metadata } from "next"
import '../styles/ConeSectionsManager.css';
import '../styles/index.css';

export const metadata: Metadata = {
  title: 'Cone Visualization',
  description: 'Cone Visualization - A React application for visualizing cone measurements',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <meta name="theme-color" content="#000000" />
            </head>
            <body>
                <main>{children}</main>
            </body>
        </html>
    )
}