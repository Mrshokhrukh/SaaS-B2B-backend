import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1739300000000 implements MigrationInterface {
  name = 'Initial1739300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(
      `CREATE TYPE role_enum AS ENUM ('BUSINESS_OWNER','STAFF')`,
    );
    await queryRunner.query(
      `CREATE TYPE contract_status_enum AS ENUM ('CREATED','SENT','VIEWED','SIGNED','PAID','VOIDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE invoice_status_enum AS ENUM ('PENDING','PAID','FAILED','VOID')`,
    );
    await queryRunner.query(
      `CREATE TYPE payment_provider_enum AS ENUM ('MOCK_CLICK','MOCK_PAYME')`,
    );
    await queryRunner.query(
      `CREATE TYPE payment_status_enum AS ENUM ('INITIATED','SUCCEEDED','FAILED')`,
    );

    await queryRunner.query(`
      CREATE TABLE businesses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(180) NOT NULL UNIQUE,
        slug varchar(180) NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL,
        email varchar(150) NOT NULL,
        full_name varchar(160) NOT NULL,
        password_hash varchar(255) NOT NULL,
        refresh_token_hash varchar(255),
        role role_enum NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        last_login_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_users_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        CONSTRAINT uq_users_business_email UNIQUE (business_id, email)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL,
        full_name varchar(160) NOT NULL,
        email varchar(180) NOT NULL,
        phone varchar(30),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_clients_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        CONSTRAINT uq_clients_business_email UNIQUE (business_id, email)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE contract_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL,
        name varchar(180) NOT NULL,
        body text NOT NULL,
        version integer NOT NULL DEFAULT 1,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_templates_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE contracts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL,
        client_id uuid NOT NULL,
        template_id uuid NOT NULL,
        created_by_user_id uuid NOT NULL,
        title varchar(180) NOT NULL,
        rendered_body text NOT NULL,
        public_token varchar(64) NOT NULL UNIQUE,
        status contract_status_enum NOT NULL DEFAULT 'CREATED',
        contract_number varchar(60) NOT NULL UNIQUE,
        amount_cents integer NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'USD',
        sent_at timestamptz,
        viewed_at timestamptz,
        viewer_ip varchar(80),
        signed_at timestamptz,
        signed_ip varchar(80),
        signed_pdf_path varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_contract_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        CONSTRAINT fk_contract_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        CONSTRAINT fk_contract_template FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE RESTRICT,
        CONSTRAINT fk_contract_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL,
        contract_id uuid NOT NULL UNIQUE,
        invoice_number varchar(60) NOT NULL UNIQUE,
        amount_cents integer NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'USD',
        status invoice_status_enum NOT NULL DEFAULT 'PENDING',
        due_at timestamptz,
        paid_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_invoice_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        CONSTRAINT fk_invoice_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL,
        invoice_id uuid NOT NULL,
        provider payment_provider_enum NOT NULL,
        provider_payment_id varchar(120) NOT NULL,
        amount_cents integer NOT NULL,
        currency varchar(3) NOT NULL,
        status payment_status_enum NOT NULL DEFAULT 'INITIATED',
        checkout_url varchar(300),
        provider_payload jsonb,
        paid_at timestamptz,
        webhook_verified_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_payment_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        CONSTRAINT uq_payment_provider_ref UNIQUE (provider, provider_payment_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id bigserial PRIMARY KEY,
        business_id uuid,
        user_id uuid,
        action varchar(120) NOT NULL,
        entity_type varchar(80) NOT NULL,
        entity_id varchar(80),
        ip_address varchar(80),
        user_agent varchar(256),
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_audit_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_contract_business_status ON contracts (business_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_invoice_business_status ON invoices (business_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payment_business_status ON payments (business_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_business_created ON audit_logs (business_id, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_user_created ON audit_logs (user_id, created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_user_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_business_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_business_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoice_business_status`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_contract_business_status`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS contracts`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_templates`);
    await queryRunner.query(`DROP TABLE IF EXISTS clients`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS businesses`);

    await queryRunner.query(`DROP TYPE IF EXISTS payment_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_provider_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS invoice_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS contract_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS role_enum`);
  }
}
