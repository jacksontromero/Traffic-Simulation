/**
 * Interface for a gridEvent object
 */
interface gridEvent {
    priority: number,
    value: Function,
    name: String
}

/**
 * Constructs a gridEvent object
 * @param priority 
 * @param value 
 */
function gridEventFactory(priority: number, value: Function, name: String): gridEvent {
    return {
        priority: priority,
        value: value,
        name: name
    }
}