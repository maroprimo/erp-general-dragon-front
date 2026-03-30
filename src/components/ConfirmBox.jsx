export default function ConfirmBox({
  title = "Confirmation",
  message = "Êtes-vous sûr ?",
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <p className="mt-3 text-slate-600">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl bg-slate-300 px-4 py-2 text-slate-800"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-white"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}