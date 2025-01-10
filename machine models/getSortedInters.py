import json
import os
import re
import sys
from gensim.models.doc2vec import Doc2Vec, TaggedDocument
from nltk.tokenize import word_tokenize
import numpy as np
import nltk

nltk.download('punkt')

# Load the trained Doc2Vec model
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, 'doc2vec_internship_rec_model')
model = Doc2Vec.load(model_path)

# Function to clean the text
def clean_text(text):
    """Cleans the text by removing special characters, extra spaces, and digits."""
    # Replace newlines, carriage returns, and tabs with spaces
    text = re.sub(r'[\n\r\t]+', ' ', text)
    # Remove all punctuation and special characters (except for essential ones)
    text = re.sub(r'[^\w\s]', '', text)
    # Replace multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)
    # Remove digits
    text = re.sub(r'\d+', '', text)
    # Trim leading and trailing spaces
    text = text.strip()
    return text

# New user data
new_user_id = sys.argv[1]
interns_json = sys.argv[2]
profile_json = sys.argv[3]

# Parse JSON input
interns_data = json.loads(interns_json)
profile_data = json.loads(profile_json)

# Transform the interns data into TaggedDocument format
tagged_interns_data = []
for intern_entry in interns_data:
    userId = intern_entry.get('userId', '')
    location = intern_entry.get('location', '')
    interests = intern_entry.get('interests', [])

    # Combine fields into a single text string and clean the text
    text = ' '.join(interests + [location])
    text = clean_text(text)  # Clean the text

    # Tokenize the cleaned text
    words = word_tokenize(text.lower())
    tagged_interns_data.append(TaggedDocument(words=words, tags=[str(userId)]))

# Infer vectors for the interns data
inferred_vectors = [model.infer_vector(doc.words) for doc in tagged_interns_data]

# Combine all profile features into a single string
profile_text = ' '.join([
    profile_data.get('branch', ''),
    ' '.join(profile_data.get('experiences', [])),
    profile_data.get('location', ''),
    ' '.join(profile_data.get('interests', []))
])
profile_text = clean_text(profile_text)

# Tokenize and infer vector for the user's profile
profile_words = word_tokenize(profile_text.lower())
profile_vector = model.infer_vector(profile_words)

# Calculate cosine similarity between profile vector and intern vectors
similarities = []
for inferred_vector in inferred_vectors:
    similarity = np.dot(profile_vector, inferred_vector) / (np.linalg.norm(profile_vector) * np.linalg.norm(inferred_vector))
    similarities.append(similarity)

# Combine similarity scores with intern IDs
similarities_with_ids = [(similarity, intern_entry['userId']) for similarity, intern_entry in zip(similarities, interns_data)]

# Sort the interns based on similarity scores
sorted_similarities_with_ids = sorted(similarities_with_ids, key=lambda x: x[0], reverse=True)

# Display the sorted similarities and user IDs
for similarity, user_id in sorted_similarities_with_ids:
    print(f"Similarity Score: {similarity}, User ID: {user_id}")
