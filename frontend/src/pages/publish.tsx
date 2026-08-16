import { Appbar } from "../components/Appbar"
import axios from "axios";
import { BACKEND_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { ChangeEvent, useState } from "react";

export const Publish = () => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [publishing, setPublishing] = useState(false);
    const navigate = useNavigate();
    const [token] = useState(() => localStorage.getItem("token"));

    // Not logged in? Show a login prompt instead of the editor
    if (!token) {
        return <div className="min-h-screen">
            <Appbar />
            <div className="h-[80vh] flex flex-col justify-center items-center px-4">
                <div className="text-6xl">🔒</div>
                <div className="font-serif text-3xl font-extrabold pt-4">
                    Please log in first
                </div>
                <div className="text-slate-500 pt-2 max-w-sm text-center">
                    You need an account to write and publish posts.
                </div>
                <div className="pt-8 flex gap-4">
                    <button onClick={() => navigate("/signin")} type="button" className="text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 font-medium rounded-full text-sm px-6 py-2.5 transition-colors">
                        Go to Login
                    </button>
                    <button onClick={() => navigate("/signup")} type="button" className="text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100 font-medium rounded-full text-sm px-6 py-2.5 transition-colors">
                        Create Account
                    </button>
                </div>
            </div>
        </div>
    }

    return <div className="min-h-screen">
        <Appbar />
        <div className="flex justify-center w-full pt-8 px-4">
            <div className="max-w-screen-lg w-full">
                <input onChange={(e) => {
                    setTitle(e.target.value)
                }} type="text" className="w-full bg-transparent border-none focus:outline-none font-serif text-4xl font-bold placeholder-slate-300 text-slate-900" placeholder="Title" />

                <TextEditor onChange={(e) => {
                    setDescription(e.target.value)
                }} />
                <button onClick={async () => {
                    setPublishing(true);
                    try {
                        const response = await axios.post(`${BACKEND_URL}/api/v1/blog`, {
                            title,
                            content: description
                        }, {
                            headers: {
                                Authorization: localStorage.getItem("token")
                            }
                        });
                        navigate(`/blog/${response.data.id}`)
                    } finally {
                        setPublishing(false);
                    }
                }} type="submit" disabled={publishing} className="mt-4 inline-flex items-center px-5 py-2.5 text-sm font-medium text-center text-white bg-green-700 rounded-full focus:ring-4 focus:ring-green-200 hover:bg-green-800 transition-colors disabled:opacity-60">
                    {publishing ? "Publishing..." : "Publish post"}
                </button>
            </div>
        </div>
    </div>
}


function TextEditor({ onChange }: { onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void }) {
    return <div className="mt-4">
        <div className="w-full">
            <div className="border-t border-slate-200 pt-4">
                <label className="sr-only">Publish post</label>
                <textarea onChange={onChange} id="editor" rows={12} className="focus:outline-none block w-full text-lg font-serif text-slate-800 bg-transparent border-0 resize-y leading-relaxed" placeholder="Tell your story..." required />
            </div>
        </div>
    </div>
}
