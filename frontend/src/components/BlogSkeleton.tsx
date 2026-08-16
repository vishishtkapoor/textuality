export const BlogSkeleton = () => {
    return <div role="status" className="animate-pulse">
        <div className="px-2 sm:px-6 py-6 border-b border-slate-200 max-w-screen-md">
            <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded-full w-24"></div>
                <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded-full w-16"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded-md w-3/4 mt-4"></div>
            <div className="h-4 bg-gray-200 rounded-md w-full mt-3"></div>
            <div className="h-4 bg-gray-200 rounded-md w-2/3 mt-2"></div>
            <div className="h-3 bg-gray-200 rounded-full w-20 mt-4"></div>
        </div>
        <span className="sr-only">Loading...</span>
    </div>
}
