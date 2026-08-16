import { Blog } from "../hooks"
import { Appbar } from "./Appbar"
import { Avatar, formatDate } from "./BlogCard"

export const FullBlog = ({ blog }: { blog: Blog }) => {
    return <div className="min-h-screen bg-white">
        <Appbar />
        <div className="flex justify-center px-4">
            <div className="grid grid-cols-12 gap-8 w-full max-w-screen-xl pt-12">
                <div className="col-span-12 lg:col-span-8">
                    <h1 className="font-serif text-4xl sm:text-5xl font-extrabold leading-tight">
                        {blog.title}
                    </h1>
                    <div className="flex items-center gap-2 pt-4 text-slate-500">
                        <Avatar name={blog.author.name || "Anonymous"} />
                        <span className="font-medium text-slate-700 text-sm">{blog.author.name || "Anonymous"}</span>
                        <Circle />
                        <span className="text-sm">{formatDate(blog.createdAt)}</span>
                    </div>
                    <div className="pt-8 font-serif text-lg leading-8 text-slate-800 whitespace-pre-wrap">
                        {blog.content}
                    </div>
                </div>
                <div className="col-span-12 lg:col-span-4 lg:pl-8">
                    <div className="text-sm uppercase tracking-wider text-slate-500 font-medium">
                        Author
                    </div>
                    <div className="flex gap-4 pt-3 bg-slate-50 rounded-xl p-5 mt-3">
                        <Avatar size="big" name={blog.author.name || "Anonymous"} />
                        <div>
                            <div className="text-xl font-bold font-serif">
                                {blog.author.name || "Anonymous"}
                            </div>
                            <div className="pt-1 text-slate-500 leading-relaxed text-sm">
                                Wordsmith behind this story — crafting ideas worth reading.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

function Circle() {
    return <span className="h-1 w-1 rounded-full bg-slate-400 inline-block"></span>
}
