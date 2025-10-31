/**
 * Types for Web Worker communication
 * Web Workers are dumb and only allow string-serialized communication, but at least we can
 * send JSON back and forth and turn it into typed messages.
 */

import type { LocationResult } from './RecordDataAccumulator.js';

/**
 * Serializable version of ParseResults (Maps converted to arrays)
 */
export interface SerializableParseResults {
	monitoringLocations: [string, string][]; // Array of [ID, Name] tuples
	monitoringLocationResults: [string, LocationResult][]; // Array of [ID, Result] tuples
}

/**
 * Message sent to worker with a File to parse
 */
export interface WorkerFileMessage {
	type: 'file';
	file: File;
}

/**
 * Message sent to worker to cancel current processing
 */
export interface WorkerCancelMessage {
	type: 'cancel';
}

/**
 * All possible messages sent to worker
 */
export type WorkerRequestMessage = WorkerFileMessage | WorkerCancelMessage;

/**
 * Message sent from worker with results
 */
export interface WorkerSuccessMessage {
	type: 'success';
	results: SerializableParseResults;
}

/**
 * Message sent from worker on error
 */
export interface WorkerErrorMessage {
	type: 'error';
	error: string;
}

/**
 * Message sent from worker when processing is cancelled
 */
export interface WorkerCancelledMessage {
	type: 'cancelled';
}

/**
 * All possible messages from worker
 */
export type WorkerResponseMessage =
	| WorkerSuccessMessage
	| WorkerErrorMessage
	| WorkerCancelledMessage;
