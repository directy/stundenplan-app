import { useEffect, useState } from "react";
import { useRoomStore } from "../../store/roomStore";
import type { Room, NewRoom } from "../../types";
import { ROOM_TYPE_LABELS } from "../../utils/roomTypeLabels";
import { Modal } from "../shared/Modal";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { Spinner } from "../shared/Spinner";
import { RoomForm } from "./RoomForm";

export function RoomList() {
  const { rooms, loading, error, fetchRooms, createRoom, updateRoom, deleteRoom } =
    useRoomStore();

  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async (data: NewRoom) => {
    setFormLoading(true);
    try {
      await createRoom(data);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data: NewRoom) => {
    if (!editingRoom) return;
    setFormLoading(true);
    try {
      await updateRoom(editingRoom.id, data);
      setEditingRoom(null);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    await deleteRoom(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Spinner size="sm" /> Lade Raeume...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Raeume</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{rooms.length} Eintraege</span>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Hinzufuegen
          </button>
        </div>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{room.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{room.capacity}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => setEditingRoom(room)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(room.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Loeschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Neuer Raum">
        <RoomForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={formLoading}
        />
      </Modal>

      <Modal
        open={editingRoom !== null}
        onClose={() => setEditingRoom(null)}
        title="Raum bearbeiten"
      >
        {editingRoom && (
          <RoomForm
            room={editingRoom}
            onSubmit={handleUpdate}
            onCancel={() => setEditingRoom(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Raum loeschen"
        message="Soll dieser Raum wirklich geloescht werden?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
