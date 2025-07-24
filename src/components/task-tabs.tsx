import { FilterType } from "@/types/task";
import { VTODO } from "@/lib/vtodo";

export default function TaskTabs({
    currentFilter,
    onChange,
    taskCounts
}: {
    currentFilter: FilterType;
    onChange: (filter: FilterType) => void;
    taskCounts: Record<FilterType, VTODO[]>;
}) {
    const tabs = [
        { id: "all" as FilterType, label: "All" },
        { id: "today" as FilterType, label: "Today" },
        { id: "scheduled" as FilterType, label: "Scheduled" },
        { id: "completed" as FilterType, label: "Completed" },
    ];

    return (
        <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors 
              ${currentFilter === tab.id
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        <span>{tab.label}</span>
                        <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            {taskCounts[tab.id].length}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
