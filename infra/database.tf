# PostgreSQL on RDS (db.t4g.micro ≈ $13/mo, covered by your credits)
resource "aws_security_group" "rds_postgres" {
  name        = "textuality-rds-postgres"
  description = "Allow PostgreSQL access from anywhere (publicly reachable for simplicity)"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "textuality-postgres"
  engine                 = "postgres"
  instance_class         = "db.t4g.micro"
  allocated_storage      = 20
  storage_type           = "gp3"
  db_name                = "medium"
  username               = var.db_username
  password               = var.db_password
  publicly_accessible    = true
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.rds_postgres.id]

  tags = {
    Name = "textuality-postgres"
  }
}
