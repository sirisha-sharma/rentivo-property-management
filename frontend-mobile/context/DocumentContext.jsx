import React, { createContext, useState } from "react";

export const DocumentContext = createContext();

export const DocumentProvider = ({ children }) => {
    const [documents, setDocuments] = useState([]);

    // Add a new document (local state only)
    const addDocument = (doc) => {
        const newDoc = {
            _id: Date.now().toString(),
            ...doc,
            createdAt: new Date().toISOString(),
        };
        setDocuments((prev) => [newDoc, ...prev]);
        return newDoc;
    };

    // Get documents filtered by propertyId
    const getDocumentsByProperty = (propertyId) => {
        return documents.filter((d) => d.propertyId === propertyId);
    };

    // Delete a document by id
    const deleteDocument = (id) => {
        setDocuments((prev) => prev.filter((d) => d._id !== id));
    };

    return (
        <DocumentContext.Provider
            value={{
                documents,
                addDocument,
                getDocumentsByProperty,
                deleteDocument,
            }}
        >
            {children}
        </DocumentContext.Provider>
    );
};
