from database import SessionLocal, Base, engine
from models import Org, Operator, Project
from passwords import hash_password

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    db.query(Project).delete()
    db.query(Operator).delete()
    db.query(Org).delete()
    db.commit()

    org_a = Org(name="Acme Media")
    org_b = Org(name="Borealis Co")
    db.add_all([org_a, org_b])
    db.commit()
    db.refresh(org_a)
    db.refresh(org_b)

    pw_hash = hash_password("Password123!")
    db.add_all([
        Operator(email="alice@acme.test", password_hash=pw_hash, org_id=org_a.id),
        Operator(email="bob@borealis.test", password_hash=pw_hash, org_id=org_b.id),
    ])

    # Acme Media -- a creative agency's work in progress. Three projects at
    # different pipeline stages; the first two are referenced by name-matched
    # Distribute campaigns in secondary-api's seed data (Campaign.sourceProjectId).
    db.add_all([
        Project(
            name="Q4 Product Launch -- Hero Video Script",
            description="Script and shot list for the Q4 launch hero video.",
            org_id=org_a.id, status="active", stage="ready_to_distribute",
        ),
        Project(
            name="Holiday Email Sequence -- Draft Copy",
            description="Five-email holiday sequence, copy in review.",
            org_id=org_a.id, status="active", stage="in_review",
        ),
        Project(
            name="2027 Marketing Budget & Agency Rate Card",
            description="Internal budget planning doc, not for client eyes.",
            org_id=org_a.id, status="draft", stage="in_progress",
        ),
    ])

    # Borealis Co -- a second, unrelated tenant.
    db.add_all([
        Project(
            name="Spring Collection Lookbook",
            description="Photography and layout for the spring lookbook.",
            org_id=org_b.id, status="active", stage="ready_to_distribute",
        ),
        Project(
            name="Partner Co-Marketing Deck",
            description="Joint pitch deck for the retail partner program.",
            org_id=org_b.id, status="active", stage="in_review",
        ),
    ])

    db.commit()
    print("Seeded core-api. Logins:")
    print("  alice@acme.test / Password123!  (Acme Media)")
    print("  bob@borealis.test / Password123! (Borealis Co)")
    db.close()


if __name__ == "__main__":
    seed()
