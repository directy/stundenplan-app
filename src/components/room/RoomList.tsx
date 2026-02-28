import { useEffect } from "react";
import { useRoomStore } from "../../store/roomStore";

export function RoomList() {
  const { rooms, loading, error, fetchRooms } = useRoomStore();

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  if (loading) return <div className="text-gray-500">Lade Raeume...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Raeume</h2>
        <span className="text-sm text-gray-500">{rooms.length} Eintraege</span>
      </div>

      {rooms.length === 0 ? (
        <p className="text-gray-500">Noch keine Raeume angelegt.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kapazitaet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{room.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{room.roomType}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{room.capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
