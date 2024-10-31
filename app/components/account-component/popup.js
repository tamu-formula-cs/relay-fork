import React, { useState } from "react";

const NewUserPopup = ({ onClose }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Implement the logic to save the new user
        // You might want to send the data to an API route or your Prisma instance

        // Example: Sending the data to a Next.js API route
        const response = await fetch("/api/new-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, email }),
        });

        if (response.ok) {
            // Handle successful submission, e.g., close the popup or refresh the page
            onClose(); // Call the onClose prop to hide the popup
        } else {
            // Handle errors (e.g., show an error message)
        }
    };

    return (
        <div className="popup-overlay">
            <div className="popup">
                <h2>Create a New User</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>
                            Name:
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </label>
                    </div>
                    <div>
                        <label>
                            Email:
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </label>
                    </div>
                    <button type="submit">Submit</button>
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewUserPopup;
