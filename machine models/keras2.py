import json
import os
import sys
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer

script_dir = os.path.dirname(os.path.abspath(__file__))

# Load the trained Siamese LSTM model
model_path = os.path.join(script_dir, 'siamese_lstm_model')
siamese_model = load_model(model_path)

# New user data
new_user_id = sys.argv[1]
new_user_data = sys.argv[2]
new_user_data = json.loads(new_user_data)

# Load and preprocess new user data
texts = [item['text'] for item in new_user_data]

tokenizer = Tokenizer()
tokenizer.fit_on_texts(texts)
sequences = tokenizer.texts_to_sequences(texts)
max_seq_length = max([len(seq) for seq in sequences])
padded_sequences = pad_sequences(sequences, maxlen=max_seq_length, padding='post')

# Infer vectors for the new user data
inferred_vectors = siamese_model.predict(padded_sequences)

# Get the vector of the specified user_id
specified_user_vector = inferred_vectors[int(new_user_id)]

# Calculate cosine similarity between inferred vectors and the vector of the specified user_id
similarities = []
for inferred_vector in inferred_vectors:
    similarity = np.dot(specified_user_vector, inferred_vector) / (np.linalg.norm(specified_user_vector) * np.linalg.norm(inferred_vector))
    similarities.append(similarity)

# Sort the new user data based on similarity scores
sorted_indices = sorted(range(len(similarities)), key=lambda i: similarities[i], reverse=True)

# Display the sorted new user data
for index in sorted_indices:
    similarity = similarities[index]
    user_entry = new_user_data[index]
    print(f"Similarity Score: {similarity}, User Entry: {user_entry}")
