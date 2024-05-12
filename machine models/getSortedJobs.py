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
model_path = os.path.join(script_dir, 'doc2vec_job_rec_model')
model = Doc2Vec.load(model_path)

# New user data
new_user_id = sys.argv[1]
new_user_data = sys.argv[2]
new_user_data = json.loads(new_user_data)


# Transform the new user data into TaggedDocument format
tagged_new_user_data = []
for user_entry in new_user_data:
    userId = user_entry.get('userId', '')
    CompanyName = user_entry.get('CompanyName', '')
    CompanyDescription = user_entry.get('CompanyDescription', '')
    Jobrole = user_entry.get('Jobrole', '')
    Eligibility = user_entry.get('Eligibility', '')
    Branch = user_entry.get('Branch', '')

    text = ' '.join([CompanyName] + [CompanyDescription] + [Jobrole] + [Eligibility] + [Branch])
    text = re.sub(r'\d+', '', text)

    words = word_tokenize(text.lower())
    tagged_new_user_data.append(TaggedDocument(words=words, tags=[userId]))

# Infer vectors for the new user data
inferred_vectors = [model.infer_vector(doc.words) for doc in tagged_new_user_data]

# Get the vector of the specified user_id
specified_user_vector = model.dv[str(new_user_id)]

# Calculate cosine similarity between inferred vectors and the vector of the specified user_id
similarities = []
for inferred_vector in inferred_vectors:
    similarity = np.dot(specified_user_vector, inferred_vector) / (np.linalg.norm(specified_user_vector) * np.linalg.norm(inferred_vector))
    similarities.append(similarity)

# Sort the new user data based on similarity scores
sorted_new_user_data = [x for _, x in sorted(zip(similarities, new_user_data), reverse=True)]

# Display the sorted new user data
sorted_indices = sorted(range(len(similarities)), key=lambda i: similarities[i], reverse=True)
for index in sorted_indices:
    similarity = similarities[index]
    user_entry = sorted_new_user_data[index]
    print(f"Similarity Score: {similarity}, User Entry: {user_entry}")

