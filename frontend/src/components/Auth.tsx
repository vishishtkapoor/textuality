import { ChangeEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignupInput } from "@100xdevs/medium-common";
import axios from "axios";
import { BACKEND_URL } from "../config";

export const Auth = ({ type }: { type: "signup" | "signin" }) => {
    const navigate = useNavigate();
    const [postInputs, setPostInputs] = useState<SignupInput>({
        name: "",
        username: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function sendRequest() {
        setSubmitting(true);
        setError("");
        try {
            const response = await axios.post(`${BACKEND_URL}/api/v1/user/${type === "signup" ? "signup" : "signin"}`, postInputs);
            const jwt = response.data;
            localStorage.setItem("token", jwt);
            navigate("/allblogs");
        } catch (e: any) {
            console.log(e);
            const msg = e?.response?.data?.message || e?.response?.data?.error || "Something went wrong. Please try again.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    }

    return <div className="h-screen flex justify-center flex-col bg-white">
        <div className="flex justify-center">
            <div className="w-full max-w-md px-10">
                <div className="text-center">
                    <Link to="/allblogs" className="font-serif text-3xl font-bold text-green-700 tracking-tight">
                        Textuality
                    </Link>
                </div>
                <div className="pt-6">
                    <div className="text-2xl font-bold">
                        {type === "signup" ? "Create an account" : "Welcome back"}
                    </div>
                    <div className="text-slate-500 pt-1">
                        {type === "signin" ? "Don't have an account?" : "Already have an account?"}
                        <Link className="pl-1 text-green-700 font-medium hover:underline" to={type === "signin" ? "/signup" : "/signin"}>
                            {type === "signin" ? "Sign up" : "Sign in"}
                        </Link>
                    </div>
                </div>
                <div className="pt-4">
                    {type === "signup" ? <LabelledInput label="Name" placeholder="Vishisht Kapoor..." onChange={(e) => {
                        setPostInputs({
                            ...postInputs,
                            name: e.target.value
                        })
                    }} /> : null}
                    <LabelledInput label="Username" placeholder="you@example.com" onChange={(e) => {
                        setPostInputs({
                            ...postInputs,
                            username: e.target.value
                        })
                    }} />
                    <LabelledInput label="Password" type={"password"} placeholder="••••••••" onChange={(e) => {
                        setPostInputs({
                            ...postInputs,
                            password: e.target.value
                        })
                    }} />
                    {error ? <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                        {error}
                    </div> : null}
                    <button onClick={sendRequest} disabled={submitting} type="button" className="mt-6 w-full text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors disabled:opacity-60">
                        {submitting ? "Please wait..." : type === "signup" ? "Create account" : "Sign in"}
                    </button>
                    <button onClick={() => navigate("/allblogs")} type="button" className="mt-3 w-full text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors">
                        Skip for now — just browsing
                    </button>
                </div>
            </div>
        </div>
    </div>
}

interface LabelledInputType {
    label: string;
    placeholder: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    type?: string;
}

function LabelledInput({ label, placeholder, onChange, type }: LabelledInputType) {
    return <div>
        <label className="block mb-1.5 text-sm text-slate-700 font-medium pt-4">{label}</label>
        <input onChange={onChange} type={type || "text"} id="first_name" className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 transition-colors" placeholder={placeholder} required />
    </div>
}
