/**
 * InteractionTracker - Event accumulation and data tracking for experiments
 *
 * This class listens to game controller events and builds structured data
 * according to the data-tracking.ts schema. It generates InteractionEvent
 * objects and accumulates TrialEndData for export.
 *
 * ## Key Responsibilities
 * - Track interaction lifecycle (pickup → placedown)
 * - Accumulate click events and mouse tracking between interactions
 * - Generate InteractionEvent objects with state snapshots
 * - Build TrialEndData on trial completion
 * - Call onInteraction/onTrialEnd callbacks for data export
 *
 * ## Architecture
 * ```
 * User Interaction
 *   ↓
 * UI Controllers (drag/click)
 *   ↓
 * BaseGameController Events
 *   ↓
 * InteractionTracker
 *   ↓
 * onInteraction(event) → socket.emit()
 * onTrialEnd(data) → socket.emit()
 * ```
 */