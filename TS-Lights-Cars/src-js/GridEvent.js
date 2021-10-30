/**
 * Constructs a gridEvent object
 * @param priority
 * @param value
 */
function gridEventFactory(priority, value, name) {
    return {
        priority: priority,
        value: value,
        name: name
    };
}
