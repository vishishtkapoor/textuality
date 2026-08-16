import { Avatar } from "./BlogCard"
import { Link } from "react-router-dom"

export const Appbar = () => {
    const token = localStorage.getItem("token");
    return <div className="border-b flex justify-between px-10 py-4">
        <Link to={'/allblogs'} className="flex flex-col justify-center cursor-pointer">
            Medium
        </Link>
        <div className="flex items-center">
            <Link to={`/publish`}>
                <button type="button" className="mr-4 text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2 mb-2 ">New</button>
            </Link>

            {token ? <Avatar size={"big"} name="harkirat" /> : <>
                <Link to="/signin" className="mr-4 text-gray-700 font-medium hover:text-gray-900">Sign in</Link>
                <Link to="/signup" className="text-white bg-gray-800 hover:bg-gray-900 rounded-full text-sm px-5 py-2.5 font-medium">Sign up</Link>
            </>}
        </div>
    </div>
}