import { useEffect, useState, useMemo } from "react";
import { useTeacherStore } from "../../store/teacherStore";
import { useWishStore } from "../../store/wishStore";
import { useRewardStore } from "../../store/rewardStore";
import { TeacherPreferencesGrid } from "../teacher/TeacherPreferencesGrid";
import { wishTypeLabels, wishPriorityLabels, wishPriorityColors } from "../../utils/wishLabels";
import type { WishType, WishPriority } from "../../types";

interface TeacherScheduleSidebarProps {
  teacherId: number;
}

export function TeacherScheduleSidebar({ teacherId }: TeacherScheduleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const { teachers } = useTeacherStore();
  const { wishes, fetchWishes } = useWishStore();
  const { rankings, fetchRankings } = useRewardStore();

  const teacher = useMemo(
    () => teachers.find((t) => t.id === teacherId),
    [teachers, teacherId],
  );

  useEffect(() => {
    fetchWishes(teacherId);
    fetchRankings();
  }, [teacherId, fetchWishes, fetchRankings]);

  const activeWishes = useMemo(
    () => wishes.filter((w) => w.isActive),
    [wishes],
  );

  const ranking = useMemo(
    () => rankings.find((r) => r.teacherId === teacherId),
    [rankings, teacherId],
  );

  if (!teacher) return null;

  return (
    <div className="print:hidden w-80 flex-shrink-0">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              {teacher.name}
            </span>
            {teacher.partTimeQuota < 1.0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                {Math.round(teacher.partTimeQuota * 100)}%
              </span>
            )}
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className={`text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
          >
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {!collapsed && (
          <div className="p-3 pt-0 space-y-4">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-50 rounded p-2">
                <div className="text-gray-500">Engagement</div>
                <div className="font-semibold text-blue-700">
                  {teacher.engagementScore.toFixed(2)}
                </div>
              </div>
              <div className="bg-green-50 rounded p-2">
                <div className="text-gray-500">Pädagogik</div>
                <div className="font-semibold text-green-700">
                  {teacher.pedagogicalScore.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Ranking */}
            {ranking && (
              <div className="bg-purple-50 rounded p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Belohnungspunkte</span>
                  <span className="font-semibold text-purple-700">
                    {ranking.totalPoints} Pkt.
                  </span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-gray-500">Rang</span>
                  <span className="font-semibold text-purple-700">
                    #{ranking.rank} (x{ranking.rankingMultiplier.toFixed(2)})
                  </span>
                </div>
              </div>
            )}

            {/* Preferences Grid */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-1">Zeitpräferenzen</h4>
              <div className="scale-[0.85] origin-top-left">
                <TeacherPreferencesGrid teacherId={teacherId} readOnly />
              </div>
            </div>

            {/* Wishes */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-1">
                Sonderwünsche
                {activeWishes.length > 0 && (
                  <span className="ml-1 text-gray-400">({activeWishes.length})</span>
                )}
              </h4>
              {activeWishes.length === 0 ? (
                <p className="text-xs text-gray-400">Keine aktiven Wünsche</p>
              ) : (
                <div className="space-y-1">
                  {activeWishes.map((wish) => (
                    <div
                      key={wish.id}
                      className="bg-gray-50 rounded p-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">
                          {wishTypeLabels[wish.wishType as WishType] ?? wish.wishType}
                        </span>
                        <span className={`text-[10px] font-medium ${wishPriorityColors[wish.priority as WishPriority] ?? "text-gray-500"}`}>
                          {wishPriorityLabels[wish.priority as WishPriority] ?? wish.priority}
                        </span>
                      </div>
                      {wish.note && (
                        <p className="text-gray-500 mt-0.5 truncate">{wish.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Max hours */}
            <div className="text-xs text-gray-500 border-t pt-2">
              Max. {teacher.maxHoursPerDay} Stunden/Tag
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
