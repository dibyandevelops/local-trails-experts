export default function AdminHeader() {
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Console</h1>
          <p className="text-sm text-gray-600">
            Review trail requests and publish new events.
          </p>
        </div>
      </div>
    </section>
  );
}
