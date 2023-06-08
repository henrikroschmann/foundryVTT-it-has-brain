export function getActorIdFromChatMessage(messagesArray) {
	// Get the actor's name from the chat message
	let name = messagesArray[0].receiver;
  
	// Find the actor that matches the name
	const actor = game.actors._source.find(a => a.name.toLowerCase() === name);
  
	// If the actor is found, return its id
	if (actor) {
		return actor._id;
	}
  
	// If no actor is found, return an empty string
	return "";
}
  