import { Appbar } from "../components/Appbar"
import { BlogCard } from "../components/BlogCard"
import { BlogSkeleton } from "../components/BlogSkeleton";
import { useBlogs } from "../hooks";
import { Link } from "react-router-dom";

export const Blogs = () => {
    const { loading, blogs } = useBlogs();

    if (loading) {
        return <div>
            <Appbar />
            <div className="flex justify-center px-4">
                <div className="w-full max-w-screen-md">
                    <BlogSkeleton />
                    <BlogSkeleton />
                    <BlogSkeleton />
                    <BlogSkeleton />
                    <BlogSkeleton />
                </div>
            </div>
        </div>
    }

    return <div className="min-h-screen">
        <Appbar />
        <div className="flex justify-center px-4">
            <div className="w-full max-w-screen-md">
                {blogs.length === 0 ? (
                    <div className="text-center pt-24">
                        <div className="text-6xl">📖</div>
                        <div className="font-serif text-3xl font-bold pt-4">No stories yet</div>
                        <p className="text-slate-500 pt-2 max-w-sm mx-auto">
                            The feed is quiet. Be the first to share a story with the world.
                        </p>
                        <Link to="/publish">
                            <button type="button" className="mt-6 text-white bg-green-700 hover:bg-green-800 rounded-full text-sm px-6 py-2.5 font-medium transition-colors">
                                Write your first post
                            </button>
                        </Link>
                    </div>
                ) : (
                    blogs.map(blog => <BlogCard
                        id={blog.id}
                        authorName={blog.author.name || "Anonymous"}
                        title={blog.title}
                        content={blog.content}
                        publishedDate={blog.createdAt}
                    />)
                )}
            </div>
        </div>
    </div>
}
