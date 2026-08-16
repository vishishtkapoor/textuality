import { Link } from "react-router-dom";
interface BlogCardProps {
    authorName: string;
    title: string;
    content: string;
    publishedDate: string;
    id: number;
}

export const BlogCard = ({
    id,
    authorName,
    title,
    content,
    publishedDate
}: BlogCardProps) => {
    return <Link to={`/blog/${id}`} className="block group">
        <article className="px-2 sm:px-6 py-6 border-b border-slate-200 max-w-screen-md hover:bg-slate-50 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
                <Avatar name={authorName} />
                <div className="font-medium text-sm text-slate-800">{authorName}</div>
                <Circle />
                <div className="font-light text-slate-500 text-sm">
                    {formatDate(publishedDate)}
                </div>
            </div>
            <h2 className="font-serif text-2xl font-bold leading-snug pt-3 group-hover:text-green-800 transition-colors">
                {title}
            </h2>
            <p className="text-slate-600 leading-relaxed pt-1">
                {content.slice(0, 200)}{content.length > 200 ? "..." : ""}
            </p>
            <div className="text-slate-500 text-sm pt-4">
                {`${Math.ceil(content.length / 100)} min read`}
            </div>
        </article>
    </Link>
}

export function Circle() {
    return <div className="h-1 w-1 rounded-full bg-slate-400">

    </div>
}

export function formatDate(date: string): string {
    const d = new Date(date);
    const day = d.getDate();
    const ordinal = (n: number) => {
        if (n > 3 && n < 21) return "th";
        switch (n % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };
    const month = d.toLocaleString("en-US", { month: "short" });
    return `${day}${ordinal(day)} ${month} ${d.getFullYear()}`;
}

export function Avatar({ name, size = "small" }: { name: string, size?: "small" | "big" }) {
    return <div className={`relative inline-flex items-center justify-center overflow-hidden bg-green-700 rounded-full ${size === "small" ? "w-6 h-6" : "w-10 h-10"}`}>
        <span className={`${size === "small" ? "text-xs" : "text-lg"} font-medium text-white`}>
            {name ? name[0].toUpperCase() : "?"}
        </span>
    </div>
}
