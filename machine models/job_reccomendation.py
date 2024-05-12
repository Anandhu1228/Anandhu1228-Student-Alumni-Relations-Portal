import json
from gensim.models.doc2vec import Doc2Vec, TaggedDocument
import nltk
from nltk.tokenize import word_tokenize
import re
import os
nltk.download('punkt')

script_dir = os.path.dirname(os.path.abspath(__file__))

training_data_path = os.path.join(script_dir, 'training_doc2vec_job_data.json')

with open(training_data_path, 'r') as file:
    data = json.load(file)

tagged_data = []
tag_map = {}

for item in data:
    userId = item.get('userId', '')
    userName = item.get('userName', '')
    branch = item.get('branch', '')
    experiences = item.get('experiences', [])
    location = item.get('location', '')
    interests = item.get('interests', [])

    text = ' '.join(experiences + [branch] + interests + [location])
    text = re.sub(r'\d+', '', text)

    words = word_tokenize(text.lower())
    tag = str(userId)

    if tag in tag_map:
        idx = tag_map[tag]
        tagged_data[idx].words.extend(words)
    else:
        tag_map[tag] = len(tagged_data)
        tagged_data.append(TaggedDocument(words=words, tags=[tag]))

model = Doc2Vec(vector_size=100, window=2, min_count=1, workers=4, epochs=20)
model.build_vocab(tagged_data)
model.train(tagged_data, total_examples=model.corpus_count, epochs=model.epochs)

model_save_path = os.path.join(script_dir, 'doc2vec_job_rec_model')
model.save(model_save_path)
print('Doc2Vec Job recomendation model trained and saved successfully.')
