/**
 * Defines the call's kind -- inbound, outbound, ...
 */
export const callKinds = {
  inbound: 'inbound',
  outbound: 'outbound',
}

/**
 * Defines the state of the call -- ringing, inProgress, ...
 */
export const callStates = {
  inactive: 'inactive',
  pending: 'pending',
  inProgress: 'inProgress',
  finalize: 'finalize',
  ended: 'ended',
}
