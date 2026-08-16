import { Avatar } from "./BlogCard"
import { Link } from "react-router-dom"

export const Appbar = () => {
    const token = localStorage.getItem("token");
    return <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3">
            <Link to={'/allblogs'} className="font-serif text-2xl font-bold text-green-700 tracking-tight hover:text-green-800 transition-colors">
                Textuality
            </Link>
            <div className="flex items-center gap-3">
                <Link to={`/publish`}>
                    <button type="button" className="text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 font-medium rounded-full text-sm px-5 py-2 transition-colors">
                        ✍️ Write
                    </button>
                </Link>

                {token ? <Avatar size={"big"} name="harkirat" /> : <>
                    <Link to="/signin" className="text-slate-700 font-medium hover:text-green-700 transition-colors">Sign in</Link>
                    <Link to="/signup" className="text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 rounded-full text-sm px-5 py-2 font-medium transition-colors">Get started</Link>
                </>}
            </div>
        </div>
    </header>
}
