import ToyRender from "./ToyRender"

const ToyCard = ({ toy }) => (
    <div className="basis-1/6 w-full max-w-sm overflow-hidden bg-white rounded-lg shadow-lg dark:bg-gray-800">
        <ToyRender sections={toy.sections} />
        <div className="flex items-center px-6 py-3 bg-gray-900">
            <h1 className="text-lg font-semibold text-white">{toy.name} {toy.size}</h1>
        </div>

        <div className="px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{toy.brand}</h1>

            <div className="flex items-center mt-4 text-gray-700 dark:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024"><path fill="currentColor" d="M840 836H184c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h656c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zm0-724H184c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h656c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zM610.8 378c6 0 9.4-7 5.7-11.7L515.7 238.7a7.14 7.14 0 0 0-11.3 0L403.6 366.3a7.23 7.23 0 0 0 5.7 11.7H476v268h-62.8c-6 0-9.4 7-5.7 11.7l100.8 127.5c2.9 3.7 8.5 3.7 11.3 0l100.8-127.5c3.7-4.7.4-11.7-5.7-11.7H548V378h62.8z" /></svg>                
                <h1 className="px-2 text-sm">{toy.height} mm</h1>
            </div>

            <div className="flex items-center mt-4 text-gray-700 dark:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10Zm7-10l-3-3m3 3l-3 3m3-3H5m0 0l3-3m-3 3l3 3" />
                </svg>
                <h1 className="px-2 text-sm">{toy.diameter} mm</h1>
            </div>
        </div>
    </div>
)


export default ToyCard