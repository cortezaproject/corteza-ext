/**
 * Helper function to delete the given worker from a workspace
 * @param {Record} $record ext_twilio_worker Record
 * @param {Twilio} twilio Twilio client
 * @param {String} WorkspaceSid Workspace ref
 * @returns {Promise<*>}
 */
export default async function ($record, twilio, WorkspaceSid) {
  return twilio.taskrouter.workspaces(WorkspaceSid)
    .workers($record.values.WorkerSid)
    .remove()
}
