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
 * Message sent to worker to start parsing
 */
export interface WorkerStartMessage {
	type: 'start';
}

/**
 * Message sent to worker with a chunk of data
 */
export interface WorkerChunkMessage {
	type: 'chunk';
	data: ArrayBuffer;
}

/**
 * Message sent to worker to signal end of stream
 */
export interface WorkerEndMessage {
	type: 'end';
}

/**
 * All possible messages sent to worker
 */
export type WorkerRequestMessage = WorkerStartMessage | WorkerChunkMessage | WorkerEndMessage;

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
 * All possible messages from worker
 */
export type WorkerResponseMessage = WorkerSuccessMessage | WorkerErrorMessage;
